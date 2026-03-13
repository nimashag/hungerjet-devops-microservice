import { useRef } from "react";
import gsap from "gsap";

type LiquidSubmitButtonProps = {
  label: string;
};

const LiquidSubmitButton = ({ label }: LiquidSubmitButtonProps) => {
  const liquidRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    gsap.to(liquidRef.current, {
      x: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(liquidRef.current, {
      x: "-100%",
      duration: 0.5,
      ease: "power2.inOut",
    });
  };

  return (
    <div className="relative w-full mt-2">
      <button
        type="submit"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full relative bg-black text-white py-3 rounded-full overflow-hidden z-10"
      >
        <span className="relative z-20">{label}</span>
        <div
          ref={liquidRef}
          className="absolute top-0 left-0 h-full w-full bg-green-500 rounded-full z-10"
          style={{ transform: "translateX(-100%)" }}
        />
      </button>
    </div>
  );
};

export default LiquidSubmitButton;
