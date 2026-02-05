package topdf

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
)

const apiURL = "http://0.0.0.0:8000"

func GeneratePDFFromMarkdown(markdownContent, cssFilePath, outputFilePath string) error {
	cssContent, err := readCSSFile(cssFilePath)
	if err != nil {
		return err
	}

	formData := prepareFormData(markdownContent, cssContent)

	fmt.Printf("Sending request to %s to generate PDF...\n", apiURL)
	resp, err := postMarkdownToPDF(apiURL, formData)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if err := checkPDFServiceResponse(resp); err != nil {
		return err
	}

	if err := ensureOutputDir(outputFilePath); err != nil {
		return err
	}

	if err := savePDFToFile(resp.Body, outputFilePath); err != nil {
		return err
	}

	fmt.Printf("Successfully saved PDF to %s\n", outputFilePath)
	return nil
}

func readCSSFile(cssFilePath string) ([]byte, error) {
	cssContent, err := os.ReadFile(cssFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read CSS file '%s': %w", cssFilePath, err)
	}
	return cssContent, nil
}

func prepareFormData(markdownContent string, cssContent []byte) url.Values {
	return url.Values{
		"markdown": {markdownContent},
		"css":      {string(cssContent)},
	}
}

func postMarkdownToPDF(apiURL string, formData url.Values) (*http.Response, error) {
	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to make POST request to md-to-pdf service: %w", err)
	}
	return resp, nil
}

func checkPDFServiceResponse(resp *http.Response) error {
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("md-to-pdf service returned a non-200 status: %s, body: %s", resp.Status, string(bodyBytes))
	}
	return nil
}

func ensureOutputDir(outputFilePath string) error {
	outputDir := filepath.Dir(outputFilePath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory '%s': %w", outputDir, err)
	}
	return nil
}

func savePDFToFile(body io.Reader, outputFilePath string) error {
	outputFile, err := os.Create(outputFilePath)
	if err != nil {
		return fmt.Errorf("failed to create output file '%s': %w", outputFilePath, err)
	}
	defer outputFile.Close()

	_, err = io.Copy(outputFile, body)
	if err != nil {
		return fmt.Errorf("failed to save PDF content to file '%s': %w", outputFilePath, err)
	}
	return nil
}
