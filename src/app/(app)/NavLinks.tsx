'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  WalletOutlined,
  MessageOutlined,
} from '@ant-design/icons'

const items = [
  { href: '/', label: 'Appointments', icon: <CalendarOutlined /> },
  { href: '/doctors', label: 'Doctors', icon: <MedicineBoxOutlined /> },
  { href: '/patients', label: 'Patients', icon: <TeamOutlined /> },
  { href: '/payments', label: 'Payments', icon: <WalletOutlined /> },
  { href: '/inbox', label: 'Inbox', icon: <MessageOutlined /> },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="nav">
      {items.map((i) => {
        const active = i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} className={`nav-link${active ? ' active' : ''}`}>
            {i.icon}
            <span className="nav-label">{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}