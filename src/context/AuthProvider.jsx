import React, { useEffect, useMemo, useState } from "react";

export const AuthContext = React.createContext(null);

/**
 * AuthProvider stores the google token object in state and fetches
 * the user's profile. It keeps a stable context object.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // google token object
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("chapgen_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("chapgen_user");
      }
    }
  }, []);

  useEffect(() => {
    if (user && !profile) {
      fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: "application/json",
          },
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((data) => setProfile(data))
        .catch(() => {
          // Clear bad token
          localStorage.removeItem("chapgen_user");
          setUser(null);
          setProfile(null);
        });
    }
  }, [user, profile]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      profile,
      setProfile,
    }),
    [user, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}