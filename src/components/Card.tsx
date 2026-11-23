import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tour?: string;
  className?: string;
  icon?: IconName;
}

export function Card({ title, subtitle, actions, children, tour, className, icon }: Props) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`} data-tour={tour}>
      <div className="card-header">
        <div className="card-heading">
          {icon && (
            <span className="card-icon">
              <Icon name={icon} size={18} />
            </span>
          )}
          <div>
            <h2 className="card-title">{title}</h2>
            {subtitle && <div className="card-subtitle secondary">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="btn-group">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
