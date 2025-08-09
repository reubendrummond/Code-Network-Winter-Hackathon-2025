import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mem/$memId/share')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/mem/$memId/share"!</div>
}
