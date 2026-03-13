import { useState } from "react";
import { useNavigate } from "react-router-dom";
import httpClient from "../../../utils/httpClient";
import { userUrl } from "../../../api";
import { resetSessionId } from "../../../utils/sessionManager";
import AuthLayout from "../shared/AuthLayout";
import AuthInputField from "../shared/AuthInputField";
import LiquidSubmitButton from "../shared/LiquidSubmitButton";
import {
  hasValidationErrors,
  validateEmailPasswordForm,
} from "../shared/authValidators";

const LoginAdmin = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateEmailPasswordForm(form);
    setErrors(validationErrors);
    if (hasValidationErrors(validationErrors)) return;

    try {
      // Generate new session ID BEFORE login request so login uses the new sessionId
      resetSessionId();

      const res = await httpClient.post(`${userUrl}/api/auth/login`, form);

      if (res.data.user.role === "appAdmin") {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/admin-dashboard");
      } else {
        alert("Access denied: Not a system administrator");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-blue-100 via-white to-purple-200"
      title="Admin Login"
      subtitle="Welcome back, system admin. Manage users and monitor the platform."
      imageSrc="https://i.pinimg.com/736x/65/95/8c/65958c40aeb6ed8023c8b491572276bf.jpg"
      imageAlt="Admin Panel Illustration"
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthInputField
          name="email"
          placeholder="Email"
          value={form.email}
          error={errors.email}
          onChange={handleChange}
        />

        <AuthInputField
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          error={errors.password}
          onChange={handleChange}
        />

        <div className="text-right text-sm text-green-600 hover:underline cursor-pointer">
          Forgot Password?
        </div>

        <LiquidSubmitButton label="Login" />
      </form>
    </AuthLayout>
  );
};

export default LoginAdmin;
