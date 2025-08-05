import { useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import './App.css';
import HeroPage from './pages/HeroPage'; // Import the new component

const LandingPage = ({ login }) => (
  <div className="landing-page">
    <h1>Welcome to ChapGen</h1>
    <p>AI-powered YouTube chapter generation, built on a fully cloud-native, event-driven architecture.</p>
    <button onClick={login} className="submit-btn">
      Sign in with Google to Generate Chapters
    </button>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('chapgen_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      localStorage.setItem('chapgen_user', JSON.stringify(codeResponse));
      setUser(codeResponse);
    },
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/youtube',
  });

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('chapgen_user');
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    if (user && !profile) {
      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          Accept: 'application/json',
        },
      })
      .then(res => {
        if (!res.ok) throw new Error('Token is invalid');
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(err => {
        console.log('Failed to fetch profile, logging out:', err);
        handleLogout();
      });
    }
  }, [user, profile]);

  return (
    <div className="App">
      <header className="App-header">
        {profile ? (
          <HeroPage user={user} profile={profile} handleLogout={handleLogout} />
        ) : (
          <LandingPage login={login} />
        )}
      </header>
    </div>
  );
}

export default App;