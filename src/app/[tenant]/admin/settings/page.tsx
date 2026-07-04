export default async function AdminSettingsPage() {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6 font-body">
      <div>
        <h2 className="text-xl font-display font-black text-ink">Admin Settings</h2>
        <p className="text-sm text-gray-500 font-medium">Manage organization-wide administration preferences.</p>
      </div>
      
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
        System configurations are set to active. General settings are stubbed for development.
      </div>
    </div>
  );
}
