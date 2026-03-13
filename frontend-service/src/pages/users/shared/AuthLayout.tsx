import { ReactNode } from "react";

type AuthLayoutProps = {
  gradientClass: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  children: ReactNode;
  footer?: ReactNode;
};

const AuthLayout = ({
  gradientClass,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  children,
  footer,
}: AuthLayoutProps) => {
  return (
    <div className={`flex h-screen w-full font-sans ${gradientClass}`}>
      <div className="w-full md:w-1/2 flex justify-center items-center px-6">
        <div className="w-full max-w-md bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/40">
          <h2 className="text-4xl font-bold mb-2 font-playfair text-gray-900 text-center">
            {title}
          </h2>
          <p className="text-gray-600 mb-6 text-center">{subtitle}</p>

          {children}

          {footer}
        </div>
      </div>

      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default AuthLayout;
