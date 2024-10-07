import bcrypt from 'bcrypt';

// Encrypt Password
export const hashPassword = async (plaintextPassword: string) => {
	const hash = await bcrypt.hash(plaintextPassword, 10); // Store hash in the database
	return hash;
};

// Compare password
export const comparePassword = async (
	plaintextPassword: string,
	hash: string
) => {
	const result = await bcrypt.compare(plaintextPassword, hash);
	return result;
};
