import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, icon, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {action}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
