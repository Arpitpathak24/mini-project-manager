import React, { useState, useContext } from "react";
import API from "../api";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const LoginRegister: React.FC = () => {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async () => {
    if (!username.trim() || !password) return alert("Provide username and password");
    try {
      const path = isLogin ? "/auth/login" : "/auth/register";
      const res = await API.post(path, { username: username.trim(), password });
      const token = isLogin ? res.data.token : res.data.token ?? res.data?.token;
      if (token) {
        login(token);
        navigate("/dashboard");
      } else if (!isLogin && res.data?.id) {
        // register returned user id — auto-login attempt
        const loginRes = await API.post("/auth/login", { username: username.trim(), password });
        login(loginRes.data.token);
        navigate("/dashboard");
      } else {
        alert("Unexpected response from server");
      }
    } catch (err: any) {
      console.error("Login/Register error", err?.response ?? err);
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 401) {
        // Prefer backend message if available, but map common "invalid credentials"
        const backendMsg = (data?.error ?? data?.message ?? "").toString();
        if (/invalid credentials/i.test(backendMsg) || backendMsg === "") {
          // user likely doesn't exist or password wrong -> prompt to register first
          setError("User not registered. Please register first.");
        } else {
          setError(backendMsg);
        }
      } else {
        setError(data?.error ?? data?.message ?? "Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">{isLogin ? "Login" : "Register"}</h1>

        <div className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            onClick={submit}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          >
            {isLogin ? "Login" : "Register"}
          </button>
          <div className="text-center text-sm text-gray-500">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:underline"
            >
              {isLogin ? "Create an account" : "Have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;
