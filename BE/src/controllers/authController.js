import bcrypt from 'bcrypt';

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    // Save user to database
    res.status(201).json({ message: 'User created successfully', hashedPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
