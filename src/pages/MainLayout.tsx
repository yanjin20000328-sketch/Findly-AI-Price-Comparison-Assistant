import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <Outlet />
      </div>
    </div>
  );
}
