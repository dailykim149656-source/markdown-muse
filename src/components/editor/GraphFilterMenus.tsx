import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import {
  EDGE_FILTER_OPTIONS,
  GRAPH_MODE_OPTIONS,
  ISSUE_FILTER_OPTIONS,
  NODE_FILTER_OPTIONS,
  describeGraphFilterSummaries,
  edgeFilterKey,
  graphModeKey,
  issueFilterKey,
  type EdgeFilter,
  type GraphMode,
  type IssueFilter,
  type NodeFilter,
  nodeFilterKey,
} from "@/components/editor/workspaceGraphUtils";

interface GraphFilterMenusProps {
  edgeFilter: EdgeFilter;
  graphMode: GraphMode;
  issueFilter: IssueFilter;
  issuesOnly: boolean;
  layout?: "inline" | "stacked";
  nodeFilter: NodeFilter;
  onEdgeFilterChange: (value: EdgeFilter) => void;
  onGraphModeChange: (value: GraphMode) => void;
  onIssueFilterChange: (value: IssueFilter) => void;
  onIssuesOnlyChange: (value: boolean) => void;
  onNodeFilterChange: (value: NodeFilter) => void;
  triggerClassName?: string;
}

const summaryClassNameByLayout: Record<NonNullable<GraphFilterMenusProps["layout"]>, string> = {
  inline: "max-w-[16rem]",
  stacked: "max-w-full",
};

const GraphFilterTrigger = forwardRef<HTMLButtonElement, {
  ariaLabel: string;
  label: string;
  layout?: GraphFilterMenusProps["layout"];
  summary: string;
  triggerClassName?: string;
}>(({
  ariaLabel,
  label,
  layout = "inline",
  summary,
  triggerClassName,
  ...props
}, ref) => (
  <Button
    aria-label={ariaLabel}
    className={cn(
      "justify-between gap-2 text-left font-normal",
      layout === "stacked" ? "h-8 w-full px-2 text-[10px]" : "h-8 px-3 text-[11px]",
      triggerClassName,
    )}
    ref={ref}
    size="sm"
    title={`${label}: ${summary}`}
    type="button"
    variant="outline"
    {...props}
  >
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("truncate text-foreground", summaryClassNameByLayout[layout])}>{summary}</span>
    </span>
    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  </Button>
));
GraphFilterTrigger.displayName = "GraphFilterTrigger";

const GraphFilterMenus = ({
  edgeFilter,
  graphMode,
  issueFilter,
  issuesOnly,
  layout = "inline",
  nodeFilter,
  onEdgeFilterChange,
  onGraphModeChange,
  onIssueFilterChange,
  onIssuesOnlyChange,
  onNodeFilterChange,
  triggerClassName,
}: GraphFilterMenusProps) => {
  const { t } = useI18n();
  const summaries = describeGraphFilterSummaries({
    edgeFilter,
    graphMode,
    issueFilter,
    issuesOnly,
    nodeFilter,
    t,
  });
  const containerClassName = layout === "stacked" ? "grid gap-1.5" : "flex flex-wrap gap-2";
  const contentClassName = layout === "stacked" ? "w-60" : "w-64";
  const labelClassName = "text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
  const itemClassName = layout === "stacked" ? "text-xs" : "text-[11px]";

  return (
    <div className={containerClassName}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GraphFilterTrigger
            ariaLabel={t("knowledge.graphViewMenuAria")}
            label={t("knowledge.graphFilterViewLabel")}
            layout={layout}
            summary={summaries.view}
            triggerClassName={triggerClassName}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={contentClassName}>
          <DropdownMenuLabel className={labelClassName}>
            {t("knowledge.graphFilterViewLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup onValueChange={(value) => onGraphModeChange(value as GraphMode)} value={graphMode}>
            {GRAPH_MODE_OPTIONS.map((value) => (
              <DropdownMenuRadioItem className={itemClassName} key={`graph-mode-option-${value}`} value={value}>
                {t(graphModeKey(value))}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GraphFilterTrigger
            ariaLabel={t("knowledge.graphNodeMenuAria")}
            label={t("knowledge.graphFilterNodesLabel")}
            layout={layout}
            summary={summaries.nodes}
            triggerClassName={triggerClassName}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={contentClassName}>
          <DropdownMenuLabel className={labelClassName}>
            {t("knowledge.graphFilterNodeTypeLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup onValueChange={(value) => onNodeFilterChange(value as NodeFilter)} value={nodeFilter}>
            {NODE_FILTER_OPTIONS.map((value) => (
              <DropdownMenuRadioItem className={itemClassName} key={`node-filter-option-${value}`} value={value}>
                {t(nodeFilterKey(value))}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className={labelClassName}>
            {t("knowledge.graphFilterScopeLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={issuesOnly}
            className={itemClassName}
            onCheckedChange={(checked) => onIssuesOnlyChange(checked === true)}
          >
            {t("knowledge.graphIssuesOnly")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GraphFilterTrigger
            ariaLabel={t("knowledge.graphRelationsMenuAria")}
            label={t("knowledge.graphFilterRelationsLabel")}
            layout={layout}
            summary={summaries.relations}
            triggerClassName={triggerClassName}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={contentClassName}>
          <DropdownMenuLabel className={labelClassName}>
            {t("knowledge.graphFilterEdgeTypeLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup onValueChange={(value) => onEdgeFilterChange(value as EdgeFilter)} value={edgeFilter}>
            {EDGE_FILTER_OPTIONS.map((value) => (
              <DropdownMenuRadioItem className={itemClassName} key={`edge-filter-option-${value}`} value={value}>
                {t(edgeFilterKey(value))}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className={labelClassName}>
            {t("knowledge.graphFilterIssueTypeLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup onValueChange={(value) => onIssueFilterChange(value as IssueFilter)} value={issueFilter}>
            {ISSUE_FILTER_OPTIONS.map((value) => (
              <DropdownMenuRadioItem className={itemClassName} key={`issue-filter-option-${value}`} value={value}>
                {t(issueFilterKey(value))}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default GraphFilterMenus;
