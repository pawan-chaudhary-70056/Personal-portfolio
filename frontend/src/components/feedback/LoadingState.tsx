export function LoadingState({ message }: { message: string }) {
  return (
    <p role="status" className="text-body-sm text-muted-light">
      {message}
    </p>
  )
}
