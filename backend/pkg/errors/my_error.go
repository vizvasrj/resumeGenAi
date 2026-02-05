// file: myerror/error.go
package errors

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"runtime"

	"github.com/google/uuid"
)

// Error remains the internal representation of the error.
// We keep it unexported for some fields to control the public API.
type Error struct {
	UID        uuid.UUID
	Inner      error
	Message    string
	stackTrace []uintptr // Keep this unexported, we will format it for logging
	Misc       map[string]any
	StatusCode int
}

// ... [New, Wrap, Unwrap, Error(), Status(), With... methods remain the same] ...
// Let's assume the improved versions from the previous answer are here.
// For brevity, I'll only show the new/modified parts.

// captureStack captures the stack trace.
func captureStack(skip int) []uintptr {
	const depth = 32
	var pcs [depth]uintptr
	n := runtime.Callers(skip+1, pcs[:])
	return pcs[0:n]
}

// New creates a new Error.
func New(format string, args ...any) *Error {
	return &Error{
		UID:        uuid.New(),
		Message:    fmt.Sprintf(format, args...),
		stackTrace: captureStack(2),
		Misc:       make(map[string]any),
	}
}

// Wrap wraps an existing error.
func Wrap(err error, format string, args ...any) *Error {
	if err == nil {
		return nil
	}
	var existingError *Error
	if errors.As(err, &existingError) {
		return &Error{
			UID:        uuid.New(),
			Inner:      err,
			Message:    fmt.Sprintf(format, args...),
			stackTrace: existingError.stackTrace, // Preserve original stack
			Misc:       make(map[string]any),
		}
	}
	return &Error{
		UID:        uuid.New(),
		Inner:      err,
		Message:    fmt.Sprintf(format, args...),
		stackTrace: captureStack(2),
		Misc:       make(map[string]any),
	}
}

// Error returns the full error message chain.
func (e *Error) Error() string {
	if e.Inner != nil {
		return fmt.Sprintf("%s: %s", e.Message, e.Inner.Error())
	}
	return e.Message
}

// Unwrap allows for standard error unwrapping.
func (e *Error) Unwrap() error {
	return e.Inner
}

// WithStatusCode adds an HTTP status code to the error.
func (e *Error) WithStatusCode(code int) *Error {
	e.StatusCode = code
	return e
}

// With adds a value to the Misc map.
func (e *Error) With(key string, value any) *Error {
	if e.Misc == nil {
		e.Misc = make(map[string]any)
	}
	e.Misc[key] = value
	return e
}

// Status returns the HTTP status code.
func (e *Error) Status() int {
	if e.StatusCode != 0 {
		return e.StatusCode
	}
	var innerWithStatus interface{ Status() int }
	if errors.As(e.Inner, &innerWithStatus) {
		return innerWithStatus.Status()
	}
	return 500
}

// --- NEW JSON LOGGING ---

// LogEntry is the structured format for our JSON logs.
// This decouples the logging format from the internal error struct.
type LogEntry struct {
	UID        string         `json:"uid"`
	Error      string         `json:"error"`                // The full error message chain
	Message    string         `json:"message"`              // The message at the top-most wrap point
	StatusCode int            `json:"statusCode,omitempty"` // omitempty hides it if it's 0
	Misc       map[string]any `json:"misc,omitempty"`
	StackTrace []string       `json:"stackTrace"`
}

// ToLogEntry converts any error into a structured LogEntry.
func ToLogEntry(err error) *LogEntry {
	var myErr *Error
	if !errors.As(err, &myErr) {
		// Handle standard errors gracefully
		return &LogEntry{
			UID:        "N/A",
			Error:      err.Error(),
			Message:    err.Error(),
			StackTrace: []string{"No stack trace available for this error type."},
		}
	}

	// It is our custom error type, so we can extract all the rich info.
	return &LogEntry{
		UID:        myErr.UID.String(),
		Error:      myErr.Error(), // Full chain: "service: repo: db error"
		Message:    myErr.Message, // Top-level message: "service"
		StatusCode: myErr.Status(),
		Misc:       myErr.Misc,
		StackTrace: formatStackTrace(myErr.stackTrace),
	}
}

// LogJSON logs an error to standard log in JSON format.
// In a real app, you would use a structured logger like zerolog or logrus.
func LogJSON(err error) {
	entry := ToLogEntry(err)

	// Marshal the entry to JSON.
	jsonBytes, jsonErr := json.Marshal(entry)
	if jsonErr != nil {
		// Fallback to plain text if JSON marshalling fails
		log.Printf("{\"error\": \"failed to marshal log entry to JSON\", \"originalError\": \"%s\"}", err.Error())
		return
	}

	// Print the JSON string. This single line is one log event.
	log.Println(string(jsonBytes))
}

// formatStackTrace converts the captured stack trace to a slice of strings.
func formatStackTrace(pcs []uintptr) []string {
	if len(pcs) == 0 {
		return nil
	}

	var frames []string
	callersFrames := runtime.CallersFrames(pcs)
	for {
		frame, more := callersFrames.Next()
		if frame.File != "" {
			frames = append(frames, fmt.Sprintf("%s:%d %s", frame.File, frame.Line, frame.Function))
		}
		if !more {
			break
		}
	}
	return frames
}
