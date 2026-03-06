"use client";

interface PhoneFrameProps {
  children: React.ReactNode;
  width: number;
  height: number;
}

export default function PhoneFrame({ children, width, height }: PhoneFrameProps) {
  return (
    <div className="sim-phone-wrapper">
      <div
        className="sim-phone"
        style={{ "--sim-w": `${width}px`, "--sim-h": `${height}px` } as React.CSSProperties}
      >
        <div className="sim-phone-notch" />
        <div className="sim-phone-content">{children}</div>
      </div>
    </div>
  );
}
