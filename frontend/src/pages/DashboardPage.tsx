import { useState } from "react"
import { DashboardLayout } from "@/shared/layout/DashboardLayout"
import { ProjectList } from "@/features/projects/ProjectList"
import { PipelineMonitor } from "@/features/pipeline/PipelineMonitor"
import { AnalyticsDashboard } from "@/features/pipeline/AnalyticsDashboard"

type Tab = "projects" | "pipeline" | "analytics"

interface DashboardPageProps {
  onLogout: () => void
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("projects")

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === "projects" && <ProjectList />}
      {activeTab === "pipeline" && <PipelineMonitor />}
      {activeTab === "analytics" && <AnalyticsDashboard />}
    </DashboardLayout>
  )
}
