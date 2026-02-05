package user

import "regexp"

func IsValidEmail(email string) bool {
	// regex for validating email addresses
	// This is a simple regex and may not cover all valid email formats.
	const emailRegex = `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	re := regexp.MustCompile(emailRegex)
	return re.MatchString(email)
}

func IsValidPassword(password string) bool {
	// Password must be at least 8 characters long and contain at least one number and one special character
	const passwordRegex = `^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$`
	re := regexp.MustCompile(passwordRegex)
	return re.MatchString(password)
}

func IsValidUsername(username string) bool {
	// Username must be alphanumeric and between 3 to 20 characters
	const usernameRegex = `^[a-zA-Z0-9]{3,20}$`
	re := regexp.MustCompile(usernameRegex)
	return re.MatchString(username)
}
