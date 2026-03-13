import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import httpClient from "../../../utils/httpClient";
import { userUrl, deliveryUrl } from "../../../api";
import { resetSessionId } from "../../../utils/sessionManager";
import AuthLayout from "../shared/AuthLayout";
import AuthInputField from "../shared/AuthInputField";
import LiquidSubmitButton from "../shared/LiquidSubmitButton";
import {
  hasValidationErrors,
  validateEmailPasswordForm,
} from "../shared/authValidators";

const LoginDelivery = () => {
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

      //  Save token and user after successful login
      if (res.data.user.role === "deliveryPersonnel") {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        const token = res.data.token;
        try {
          //  Immediately check if driver profile exists
          await httpClient.get(`${deliveryUrl}/api/drivers/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("Driver profile found ");
          navigate("/driver/dashboard"); //  Driver profile exists
        } catch (profileErr: any) {
          if (profileErr.response?.status === 404) {
            console.log(
              "Driver profile missing  Redirecting to register profile...",
            );
            navigate("/driver/register-profile"); //  Driver profile missing
          } else {
            console.error("Error checking driver profile", profileErr);
            alert("Error verifying driver profile. Please try again.");
          }
        }
      } else {
        alert("Access denied: Not a delivery personnel.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-green-100 via-white to-blue-200"
      title="Delivery Login"
      subtitle="Welcome back, rider! Sign in to start delivering with HungerJet."
      imageSrc="https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
      imageAlt="Delivery Illustration"
      footer={
        <Link to="/register/delivery">
          <p className="text-center text-sm mt-6">
            Not a delivery rider yet?{" "}
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

export default LoginDelivery;
