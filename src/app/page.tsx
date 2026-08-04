import CreatePollForm from '@/components/CreatePollForm'
import RedeemCodeForm from '@/components/RedeemCodeForm'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dudle</h1>
          <p className="text-gray-500">Find a date that works for everyone</p>
        </div>
        <CreatePollForm />
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm mb-3 text-center">
            Have a code from another device?
          </p>
          <RedeemCodeForm />
        </div>
      </div>
    </div>
  )
}
