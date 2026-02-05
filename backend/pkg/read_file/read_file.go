package readfile

import "os"

func ReadFile(location string) (string, error) {
	data, err := os.ReadFile(location)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
