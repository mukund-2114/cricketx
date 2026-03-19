const supabase = require('../config/supabase');

const login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }

    // After login, fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      user: {
        ...data.user,
        ...profile
      },
      session: data.session
    });
  } catch (err) {
    console.error('[Auth] Login failed:', err.message);
    res.status(500).json({ success: false, error: 'Auth system error' });
  }
};

const signup = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Missing credentials' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || '' }
      }
    });

    if (error) {
       return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, user: data.user, session: data.session });
  } catch (err) {
    console.error('[Auth] Signup failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not create account' });
  }
};

module.exports = {
  login,
  signup
};
