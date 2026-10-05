import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const SpotlightCard = ({
    children,
    className,
    spotlightColor = "hsla(16, 99%, 55%, 0.15)",
}: {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden group",
                className
            )}
        >
            {/* Dark-mode specular top-edge highlight & diagonal glass sheen */}
            <div
                aria-hidden="true"
                className="pointer-events-none hidden dark:block absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent z-10"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none hidden dark:block absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.065)_0%,transparent_42%,rgba(255,255,255,0.015)_100%)] z-0"
            />
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />
            <div className="relative z-10 h-full">{children}</div>
        </div>
    );
};
