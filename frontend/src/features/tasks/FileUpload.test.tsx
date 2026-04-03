import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen } from "@/test/test-utils"
import { FileUpload } from "./FileUpload"

describe("FileUpload", () => {
  const defaultProps = {
    taskId: "test-task-id",
    taskType: "image",
    onClose: vi.fn(),
    onUploaded: vi.fn(),
  }

  it("renders upload form with correct task type", () => {
    renderWithProviders(<FileUpload {...defaultProps} />)
    expect(screen.getByText(/upload.*image.*files/i)).toBeInTheDocument()
  })

  it("shows cancel button", () => {
    renderWithProviders(<FileUpload {...defaultProps} />)
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("disables upload button when no files staged", () => {
    renderWithProviders(<FileUpload {...defaultProps} />)
    const button = screen.getByText("Upload & Process")
    expect(button).toBeDisabled()
  })

  it("renders for audio task type", () => {
    renderWithProviders(<FileUpload {...defaultProps} taskType="audio" />)
    expect(screen.getByText(/upload.*audio.*files/i)).toBeInTheDocument()
  })

  it("renders for text task type", () => {
    renderWithProviders(<FileUpload {...defaultProps} taskType="text" />)
    expect(screen.getByText(/upload.*text.*files/i)).toBeInTheDocument()
  })
})
