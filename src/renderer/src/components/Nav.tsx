import { FaCog } from 'react-icons/fa'

const Nav = (): JSX.Element => {
  return (
    <nav className="fixed top-0 right-0 left-0 flex justify-end items-center p-3">
      <button className="text-lg">
        <FaCog />
      </button>
    </nav>
  )
}

export default Nav
