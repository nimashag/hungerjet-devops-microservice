import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const LoginRestaurant = () => {
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
      console.log(`Login response: ${JSON.stringify(res)}`);

      const { token, user } = res.data;

      if (user.role === "restaurantAdmin") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/restaurant-dash");
      } else {
        alert("Access denied: Not a restaurant admin");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-blue-100 via-white to-purple-200"
      title="Restaurant Admin Login"
      subtitle="Access your dashboard to manage restaurant orders and menus."
      imageSrc="https://i.pinimg.com/736x/e8/9a/48/e89a4814d5742f04c1788aa2188dd7d3.jpg"
      imageAlt="Restaurant Illustration"
      footer={
        <Link to="/register/restaurant">
          <p className="text-center text-sm mt-6">
            Not registered?{" "}
            <span className="text-green-600 hover:underline cursor-pointer">
              Register your restaurant
            </span>
          </p>
        </Link>
      }
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

export default LoginRestaurant;
