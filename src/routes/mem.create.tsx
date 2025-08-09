import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mem/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/mem/create"!</div>
}
