import { createContext, useContext, useState, useEffect } from "react";
import { getMe, signin as apiSignin, signup as apiSignup, signout as apiSignout } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("patient_churn_token");
    if (token) {
      getMe()
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem("patient_churn_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signin = async (email, password) => {
    const data = await apiSignin(email, password);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await apiSignup(name, email, password);
    setUser(data.user);
    return data;
  };

  const signout = async () => {
    await apiSignout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signin, signup, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
