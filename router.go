package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"errors"
	"io/fs"
	"strings"
	"sync"
	"time"
	"github.com/gorilla/mux"
	"github.com/google/uuid"
)

type RouteConfig struct {
	Path      string        `json:"path"`
	Backend   string        `json:"backend"`
	StripPrefix string      `json:"stripPrefix"` // if empty, defaults to the entire Path content that was matched
	AllowedIPs []string     `json:"allowedIPs"`
	BackendURL *url.URL     `json:"-"`
}

type Request_SetRoute struct {
	Route *RouteConfig     `json:"route"`
}

type Config struct {
	WebUICookieName string      `json:"webuiCookieName"`
	WebUIPassword string        `json:"webuiPassword"`
	WebUIPath string            `json:"webuiPath"`
	ListenAddress string        `json:"listenAddress,omitempty"`
	Routes []*RouteConfig       `json:"routes"`
}

type Session struct {
	expires time.Time
}
func (s Session) isExpired() bool {
	return s.expires.Before(time.Now())
}

const HTTP_WRITE_TIMEOUT = 15 // seconds
const HTTP_READ_TIMEOUT = 15 // seconds
const EXPIRE_COOKIE_TIME = 3600 // seconds
const MINIMUM_PASSWORD_LENGTH = 12 // characters

var sessions = map[string]Session{}
var config_file string
var config *Config
var mu sync.RWMutex

func loadConfig(configFile string) error {
	file, err := os.Open(configFile)
	if err != nil {
		return err
	}
	defer file.Close()
	
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&config); err != nil {
		return err
	}
	
	return nil
}
func saveConfig(configFile string) error {
	file, err := os.OpenFile(configFile, os.O_RDWR | os.O_CREATE, 0644)
	if err != nil {
		return err
	}
	defer file.Close()
	
	encoder := json.NewEncoder(file)
	if err := encoder.Encode(&config); err != nil {
		return err
	}
	
	return nil
}
func isIPAllowed(ip string, allowedIPs []string) bool {
	for _, allowedIP := range allowedIPs {
		if strings.HasSuffix(allowedIP, "*") && strings.HasPrefix(ip, allowedIP[:len(allowedIP)-1]) {
			return true
		} else if strings.HasPrefix(allowedIP, "*") && strings.HasSuffix(ip, allowedIP[1:]) {
			return true
		} else if allowedIP == ip {
			return true
		}
	}
	return false
}
func authorize(w http.ResponseWriter, r *http.Request) bool {
	
	mu.RLock()
	defer mu.RUnlock()
	
	c, err := r.Cookie(config.WebUICookieName)
	if err != nil {
		if err == http.ErrNoCookie {
			w.WriteHeader(http.StatusUnauthorized)
			return false
		}
		
		w.WriteHeader(http.StatusBadRequest)
		return false
	}
	token := c.Value
	
	s, ok := sessions[token]
	if ! ok {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	
	if s.isExpired() {
		delete(sessions, token)
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	
	// extend token validity every authorized request
	// security-wise it would be better to create a new token here, and delete the previous one
	// for tracking statistics of a specific user session
	expiresAt := time.Now().Add(EXPIRE_COOKIE_TIME * time.Second)
	http.SetCookie(w, &http.Cookie{
		Name: config.WebUICookieName,
		Value: token,
		Expires: expiresAt,
	})
	
	return true
}

func Logout(w http.ResponseWriter, r *http.Request) {
	
	mu.RLock()
	defer mu.RUnlock()
	
	c, err := r.Cookie(config.WebUICookieName)
	if err != nil {
		return // no cookie, or invalid cookie, so that's fine
	}
	token := c.Value
	
	_, ok := sessions[token]
	if ok {
		delete(sessions, token)
	} else {
		return
	}
	
	expiresAt := time.Now()
	http.SetCookie(w, &http.Cookie{
		Name: config.WebUICookieName,
		Value: "",
		Expires: expiresAt,
	})
}
func Login(w http.ResponseWriter, r *http.Request) {
	
	mu.Lock()
	defer mu.Unlock()
	
	var req map[string]any
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	password, ok := req["password"].(string)
	if ! ok || password == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	// set password if none is set yet
	if config.WebUIPassword == "" && len(password) >= MINIMUM_PASSWORD_LENGTH {
		config.WebUIPassword = password
		
		// update config to filesystem
		if err := saveConfig(config_file); err != nil {
			log.Printf("Error at saveConfig(%s): %v", config_file, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	
	if config.WebUIPassword != password {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	
	token := uuid.NewString()
	expiresAt := time.Now().Add(EXPIRE_COOKIE_TIME * time.Second)
	
	sessions[token] = Session{
		expires: expiresAt,
	}
	
	http.SetCookie(w, &http.Cookie{
		Name: config.WebUICookieName,
		Value: token,
		Expires: expiresAt,
	})
}
func SetPassword(w http.ResponseWriter, r *http.Request) {
	
	if ! authorize(w, r) {
		return
	}
	
	mu.Lock()
	defer mu.Unlock()
	
	var req map[string]any
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	password, ok := req["password"].(string)
	if ! ok || password == "" || len(password) < MINIMUM_PASSWORD_LENGTH {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	config.WebUIPassword = password
	
	// update config to filesystem
	if err := saveConfig(config_file); err != nil {
		log.Printf("Error at saveConfig(%s): %v", config_file, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
func ListRoutes(w http.ResponseWriter, r *http.Request) {
	
	if ! authorize(w, r) {
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	
	err := json.NewEncoder(w).Encode(map[string]any{
		"value": config.Routes,
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
func SetRoute(w http.ResponseWriter, r *http.Request) {
	
	if ! authorize(w, r) {
		return
	}
	
	mu.Lock()
	defer mu.Unlock()
	
	var req *Request_SetRoute
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	newRouteConfig := req.Route
	if newRouteConfig == nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	backendURL, err := url.Parse(newRouteConfig.Backend)
	if err != nil {
		log.Printf("Invalid backend URL for path %s: %+v", newRouteConfig.Path, err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	replaced := false
	for i, rc := range config.Routes {
		if rc.Path == newRouteConfig.Path {
			replaced = true
			config.Routes[i] = newRouteConfig
		}
	}
	if ! replaced {
		config.Routes = append(config.Routes, newRouteConfig)
	}
	
	log.Printf("Registering %s --> %s", newRouteConfig.Path, newRouteConfig.Backend)
	
	newRouteConfig.BackendURL = backendURL
	
	// update config to filesystem
	if err := saveConfig(config_file); err != nil {
		log.Printf("Error at saveConfig(%s): %v", config_file, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
func DeleteRoute(w http.ResponseWriter, r *http.Request) {
	
	if ! authorize(w, r) {
		return
	}
	
	mu.Lock()
	defer mu.Unlock()
	
	var req map[string]any
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	path, ok := req["path"].(string)
	if ! ok || path == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	newRoutes := []*RouteConfig{}
	for _, rc := range config.Routes {
		if rc.Path != path {
			newRoutes = append(newRoutes, rc)
		}
	}
	
	if len(newRoutes) != len(config.Routes) {
		
		config.Routes = newRoutes
		
		if err := saveConfig(config_file); err != nil {
			log.Printf("Error at saveConfig(%s): %v", config_file, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
}


func main() {
	
	config_file = "/etc/router.json"
	if len(os.Args) >= 2 {
		config_file = os.Args[1]
	}
	
	if err := loadConfig(config_file); err != nil {
		if ! errors.Is(err, fs.ErrNotExist) {
			log.Fatalf("Failed to load configuration (%s): %v", config_file, err)
		} else {
			config = &Config{}
		}
	}
	
	changed := false
	
	if config.ListenAddress == "" {
		changed = true
		config.ListenAddress = ":8080"
	}
	if config.WebUIPath == "" {
		changed = true
		config.WebUIPath = "/router/"
	}
	if ! strings.HasSuffix(config.WebUIPath, "/") {
		changed = true
		config.WebUIPath = config.WebUIPath + "/"
	}
	if config.WebUICookieName == "" {
		changed = true
		config.WebUICookieName = "router_auth_token"
	}
	
	if changed {
		if err := saveConfig(config_file); err != nil {
			log.Fatalf("Failed to save configuration with defaults (%s): %v", config_file, err)
		}
	}
	
	m := mux.NewRouter()
	m.StrictSlash(false)
	
	fs := http.FileServer(http.Dir("./public_html"))
	
	log.Printf("Registering route: %s --> %s", config.WebUIPath, "<internal-webui>")
	
	for _, rc := range config.Routes {
		
		backendURL, err := url.Parse(rc.Backend)
		if err != nil {
			log.Fatalf("Invalid backend URL for path %s: %+v", rc.Path, err)
		}
		
		log.Printf("Registering %s --> %s", rc.Path, rc.Backend)
		
		rc.BackendURL = backendURL
	}
	
	m.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		
		mu.RLock()
		
		if strings.HasPrefix(r.URL.Path, config.WebUIPath) {
			
			wp := config.WebUIPath
			p := strings.TrimPrefix(r.URL.Path, wp)
			mu.RUnlock()
			
			if p == "login" {
				
				Login(w, r)
				
			} else if p == "logout" {
				
				Logout(w, r)
				
			} else if p == "set-password" {
				
				SetPassword(w, r)
				
			} else if p == "list-routes" {
				
				ListRoutes(w, r)
				
			} else if p == "set-route" {
				
				SetRoute(w, r)
				
			} else if p == "delete-route" {
				
				DeleteRoute(w, r)
				
			} else {
				
				http.StripPrefix(wp, fs).ServeHTTP(w, r)
			}
			
			return
		}
		
		var selectedRouteConfig *RouteConfig
		
		for _, rc := range config.Routes {
			pathPrefix := rc.Path
			pathEqual := rc.Path
			
			// by default "/test" and "/test/" have the same effect, they both match "/test" and "/test/" but not "/testx" or "/testx/"
			// writing "/test/" is the preferred notation (normalized)
			// otherwise we may use wildcard: "/test*" which is not the same as "/test*/" which would be a literal asterisk
			// but if we don't want /test to match, we may use "/test/*" which is equal to "/test/" but does not match "/test"
			
			if strings.HasSuffix(rc.Path, "*") {
				pathPrefix = rc.Path[:len(rc.Path)-1]
				pathEqual = pathPrefix
			} else {
				pathPrefix = strings.TrimSuffix(pathPrefix, "/") + "/"
				pathEqual = strings.TrimSuffix(pathEqual, "/")
			}
			
			if r.URL.Path == pathEqual || strings.HasPrefix(r.URL.Path, pathPrefix) {
				
				selectedRouteConfig = rc
				break
			}
		}
		
		if selectedRouteConfig == nil {
			mu.RUnlock()
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		
		clientIP, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			mu.RUnlock()
			log.Printf("Failed to parse client IP: %+v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		
		if len(selectedRouteConfig.AllowedIPs) > 0 && !isIPAllowed(clientIP, selectedRouteConfig.AllowedIPs) {
			mu.RUnlock()
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		mu.RUnlock()
		
		director := func(req *http.Request) {
			mu.RLock()
			req.URL.Scheme = selectedRouteConfig.BackendURL.Scheme
			req.URL.Host = selectedRouteConfig.BackendURL.Host
			
			stripPrefix := selectedRouteConfig.StripPrefix
			if stripPrefix == "" {
				stripPrefix = selectedRouteConfig.Path
			}
			
			// join paths properly
			p := strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(strings.TrimSuffix(stripPrefix, "*"), "/"))
			if strings.HasSuffix(stripPrefix, "*") {
				// if wildcard, remove the wildcard matched part of path until the first / (or if none, until the end)
				i := strings.Index(p, "/")
				if i >= 0 {
					p = p[i:]
				} else {
					p = ""
				}
			}
			if strings.HasSuffix(selectedRouteConfig.BackendURL.Path, "/") {
				req.URL.Path = strings.TrimSuffix(selectedRouteConfig.BackendURL.Path, "/") + p
			} else {
				req.URL.Path = selectedRouteConfig.BackendURL.Path + p
			}
			
			req.Header = r.Header.Clone()
			req.Host = r.Host
			
			log.Printf("Proxying %s to %s://%s%s", r.URL.Path, req.URL.Scheme, req.URL.Host, req.URL.Path)
			
			mu.RUnlock()
		}
		
		proxy := &httputil.ReverseProxy{
			Director: director,
			ErrorHandler: func(w http.ResponseWriter, req *http.Request, err error) {
				log.Printf("Error during proxying request: %+v", err)
				http.Error(w, "Bad Gateway", http.StatusBadGateway)
			},
		}
		
		proxy.ServeHTTP(w, r)
	})
	
	log.Printf("Starting reverse proxy on %s", config.ListenAddress)
	
	srv := &http.Server{
		Handler: m,
		Addr: config.ListenAddress,
		WriteTimeout: HTTP_WRITE_TIMEOUT * time.Second,
		ReadTimeout: HTTP_READ_TIMEOUT * time.Second,
	}
	
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
