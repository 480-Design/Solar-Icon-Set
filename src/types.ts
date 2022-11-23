import React from "react";

export type IconProps = {
  color?: string;
  size?: number;
  autoSize?: boolean;
  svgProps?: React.SVGProps<SVGSVGElement>;
  iconStyle?:
    | `Broken`
    | `LineDuotone`
    | `Linear`
    | `Outline`
    | `Bold`
    | `BoldDuotone`;
} & Omit<React.HTMLProps<HTMLSpanElement>, "color" | "size">;
