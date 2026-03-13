type AuthInputFieldProps = {
  name: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
};

const AuthInputField = ({
  name,
  placeholder,
  value,
  error,
  onChange,
  type = "text",
}: AuthInputFieldProps) => {
  return (
    <div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-3 bg-white/70 rounded-full border focus:outline-none focus:ring-2 ${
          error ? "border-red-500" : "focus:ring-green-500"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default AuthInputField;
