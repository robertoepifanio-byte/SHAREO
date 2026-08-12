import { PreLaunchHome } from "@/components/PreLaunchHome"

/**
 * A landing É a página. Sem flag, sem gate, sem ramificação.
 *
 * No app principal isto era `if (PRELAUNCH_ENABLED) return <PreLaunchHome />`
 * antes de seis queries da home de marketplace — a origem de toda a complexidade
 * que este app existe para eliminar.
 */
export default function Page() {
  return <PreLaunchHome />
}
