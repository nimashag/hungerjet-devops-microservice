import { useState } from "react";
import { useNavigate } from "react-router-dom";
import httpClient from "../../../utils/httpClient";
import { userUrl } from "../../../api";
import AuthLayout from "../shared/AuthLayout";
import AuthInputField from "../shared/AuthInputField";
import LiquidSubmitButton from "../shared/LiquidSubmitButton";
import { validateRequiredFields } from "../shared/authValidators";

type RegisterRestaurantForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

type RegisterRestaurantField = {
  name: keyof RegisterRestaurantForm;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
};

const RegisterRestaurant = () => {
  const [form, setForm] = useState<RegisterRestaurantForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  const fields: RegisterRestaurantField[] = [
    { name: "name", placeholder: "Full Name" },
    { name: "email", placeholder: "Email" },
    { name: "password", placeholder: "Password", type: "password" },
    { name: "phone", placeholder: "Phone" },
    { name: "address", placeholder: "Personal Address" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRequiredFields(
      form,
      ["name", "email", "password", "phone", "address"],
      "Invalid email",
    );

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const res = await httpClient.post(`${userUrl}/api/auth/register`, {
        ...form,
        role: "restaurantAdmin",
      });

      alert(res.data.message || "Registered successfully!");
      navigate("/restaurant-dash");
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-blue-100 via-white to-purple-200"
      title="Register Your Restaurant"
      subtitle="Join HungerJet and start managing your restaurant orders and menus."
      imageSrc="https://i.pinimg.com/736x/e8/9a/48/e89a4814d5742f04c1788aa2188dd7d3.jpg"
      imageAlt="Restaurant Owner Register"
      footer={
        <p className="text-center text-sm mt-6">
          Already registered?{" "}
          <a
            href="/login/restaurant"
            className="text-green-600 hover:underline"
          >
            Login here
          </a>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {fields.map((field) => (
          <AuthInputField
            key={field.name}
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            value={form[field.name]}
            error={errors[field.name]}
            onChange={handleChange}
          />
        ))}

        <LiquidSubmitButton label="Register" />
      </form>
    </AuthLayout>
  );
};

export default RegisterRestaurant;
