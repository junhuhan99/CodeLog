import { useState } from 'react'
import Modal from './Modal'
import { FileText, Download } from 'lucide-react'

export default function BuildLogViewer({ buildLog }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!buildLog) return null

  const downloadLog = () => {
    const blob = new Blob([buildLog], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-log-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-outline btn-sm flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        빌드 로그 보기
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="빌드 로그"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={downloadLog}
              className="btn btn-outline btn-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              다운로드
            </button>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
            <pre className="whitespace-pre-wrap">{buildLog}</pre>
          </div>
        </div>
      </Modal>
    </>
  )
}
