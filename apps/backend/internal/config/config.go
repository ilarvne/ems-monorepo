package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// Server
	Port string
	Host string

	// Database
	DatabaseURL string

	// CORS
	CORSOrigins []string

	// Kratos
	KratosPublicURL string
	KratosAdminURL  string

	// SpiceDB
	SpiceDBEndpoint     string
	SpiceDBPresharedKey string
	SpiceDBInsecure     bool

	// Logging
	LogLevel string
}

func Load() *Config {
	return &Config{
		Port:                getEnv("PORT", "5555"),
		Host:                getEnv("HOST", "0.0.0.0"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/eventdb?sslmode=disable"),
		CORSOrigins:         strings.Split(getEnv("CORS_ORIGINS", "http://localhost:5173,http://localhost:6868"), ","),
		KratosPublicURL:     getEnv("KRATOS_PUBLIC_URL", "http://localhost:4433"),
		KratosAdminURL:      getEnv("KRATOS_ADMIN_URL", "http://localhost:4434"),
		SpiceDBEndpoint:     getEnv("SPICEDB_ENDPOINT", "localhost:50051"),
		SpiceDBPresharedKey: getEnv("SPICEDB_PRESHARED_KEY", "foobar"),
		SpiceDBInsecure:     getEnvBool("SPICEDB_INSECURE", true),
		LogLevel:            getEnv("LOG_LEVEL", "debug"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		b, err := strconv.ParseBool(value)
		if err != nil {
			return defaultValue
		}
		return b
	}
	return defaultValue
}
