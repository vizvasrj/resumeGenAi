package user

func CreateUser(email, password string) (*User, error) {
	// todo: unimplemented
	return &User{
		Email:    email,
		Password: password,
	}, nil
}
