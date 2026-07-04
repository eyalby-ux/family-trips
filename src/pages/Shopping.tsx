import EditableChecklist from "../components/checklists/EditableChecklist";
import { initialShopping } from "../data/tripData";

function Shopping() {
  return (
    <EditableChecklist
      title="קניות לסופר"
      subtitle="מסונכרן בזמן אמת — כל משתתף יכול להוסיף מוצר ולשבץ אחראי"
      collectionName="shopping"
      initialItems={initialShopping.map((item) => ({
        id: item.id,
        name: item.name,
        owner: item.owner,
        done: item.done,
        details: item.quantity,
      }))}
      addButtonLabel="הוסף מוצר"
      itemNamePlaceholder="שם המוצר, למשל חלב"
      detailsPlaceholder="כמות / הערה, למשל 2 ליטר"
      seedButtonLabel="🚀 אתחל רשימת קניות"
    />
  );
}

export default Shopping;
