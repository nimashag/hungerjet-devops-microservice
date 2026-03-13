import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import httpClient from "../../../utils/httpClient";
import { userUrl } from "../../../api";
import AuthLayout from "../shared/AuthLayout";
import AuthInputField from "../shared/AuthInputField";
import LiquidSubmitButton from "../shared/LiquidSubmitButton";
import { validateRequiredFields } from "../shared/authValidators";

const RegisterDelivery = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    vehicleType: "",
    licenseNumber: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  const fields = [
    { name: "name", placeholder: "Full Name" },
    { name: "email", placeholder: "Email" },
    { name: "password", placeholder: "Password", type: "password" },
    { name: "phone", placeholder: "Phone Number" },
    { name: "address", placeholder: "Address" },
    { name: "vehicleType", placeholder: "Vehicle Type (e.g., Bike)" },
    { name: "licenseNumber", placeholder: "License Number" },
  ] as const;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRequiredFields(
      form,
      [
        "name",
        "email",
        "password",
        "phone",
        "address",
        "vehicleType",
        "licenseNumber",
      ],
      "Invalid email address",
    );

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const res = await httpClient.post(`${userUrl}/api/auth/register`, {
        ...form,
        role: "deliveryPersonnel",
      });

      alert(res.data.message || "Registered successfully!");
      navigate("/login/delivery"); // Redirect to login after successful register
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <AuthLayout
      gradientClass="bg-gradient-to-r from-green-100 via-white to-blue-200"
      title="Delivery Registration"
      subtitle="Join HungerJet's delivery team and start earning!"
      imageSrc="https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
      imageAlt="Delivery Registration"
      footer={
        <p className="text-center text-sm mt-6">
          Already registered?{" "}
          <Link to="/login/delivery" className="text-green-600 hover:underline">
            Login here
          </Link>
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

export default RegisterDelivery;
