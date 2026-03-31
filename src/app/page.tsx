import CreatePollForm from '@/components/CreatePollForm'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dudle</h1>
          <p className="text-gray-500">Find a date that works for everyone</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <CreatePollForm />
        </div>
      </div>
    </div>
  )
}
