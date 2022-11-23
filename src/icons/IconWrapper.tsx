import * as React from "react";
import { IconProps } from "../types";

export const IconWrapper: React.FC<{ icon: React.ReactNode } & IconProps> = ({
  icon,
  color: colorProp,
  size: sizeProp,
  autoSize,
  ...restProps
}) => {
  const color = colorProp ? colorProp : "currentColor";
  const size = sizeProp ? `${sizeProp}px` : autoSize ? "1em" : "16px";
  return (
    <span
      role="img"
      aria-hidden="true"
      style={{
        color: color,
        width: size,
        height: size,
        display: "inline-flex",
        fontSize: "inherit",
      }}
      {...restProps}
    >
      {icon}
    </span>
  );
};
