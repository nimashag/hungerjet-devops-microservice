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

const LoginCustomer = () => {
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
      const { token, user } = res.data;

      if (user.role === "customer") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/customer-home");
      } else {
        alert("Access denied: Not a customer account");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Invalid credentials or server error";
      alert(message);
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-green-100 via-white to-blue-200"
      title="Welcome Back!"
      subtitle="Login to HungerJet and explore delicious possibilities."
      imageSrc="https://i.pinimg.com/736x/ea/44/a8/ea44a880f9f20db0ba98bfa84cb03e76.jpg"
      imageAlt="Food Illustration"
      footer={
        <Link to="/register/customer">
          <p className="text-center text-sm mt-6">
            Not a member?{" "}
            <span className="text-green-600 hover:underline cursor-pointer">
              Register now
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

export default LoginCustomer;
