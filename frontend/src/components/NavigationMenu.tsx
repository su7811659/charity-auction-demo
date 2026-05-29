import { Menu } from "antd";
import { Link } from "react-router-dom";
import { ReactNode } from "react";


interface RouteItem {
	path: string;
	key: string;
	icon: ReactNode;
	label: string;
}

interface NavigationMenuProps {
	routes: RouteItem[];
	selectedKey: string;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ routes, selectedKey }) => {
	return (
		<Menu
			theme="dark"
			mode="horizontal"
			selectedKeys={[selectedKey]}
			style={{ flex: 1, minWidth: 0 }}
			className="header"
		>
			{routes.map(route => (
				<Menu.Item key={route.key} icon={route.icon}>
					<Link to={route.path}>{route.label}</Link>
				</Menu.Item>
			))}
		</Menu>
	);
};