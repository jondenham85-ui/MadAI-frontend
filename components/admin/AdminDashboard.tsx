export default function AdminDashboard() {
  const authorityChain = [
    "Jon Denham",
    "Alison Denham",
    "Family Authority",
    "Administrator",
    "User",
  ];

  return (
    

      
        
          AUTHORITY CHAIN
        

        
          {authorityChain.map(
            (role, index) => (
              
                {index + 1}. {role}
              
            )
          )}
        
      

      
        <div
          className="
          border
          border-cyan-500/30
          rounded-xl
