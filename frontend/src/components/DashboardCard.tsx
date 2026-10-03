import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Stellt einen einheitlichen Kartenbereich auf dem Dashboard dar.
 */
export function DashboardCard({
  title,
  subtitle,
  children,
  footer,
}: DashboardCardProps) {
  return (
    <section className="dashboard-card">
      <header className="dashboard-card__header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>

      <div className="dashboard-card__body">{children}</div>

      {footer ? (
        <footer className="dashboard-card__footer">{footer}</footer>
      ) : null}
    </section>
  );
}
