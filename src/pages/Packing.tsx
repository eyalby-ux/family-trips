import EditableChecklist from "../components/checklists/EditableChecklist";
import { initialPacking } from "../data/tripData";

function Packing() {
  return (
    <EditableChecklist
      title="ציוד קבוצתי"
      subtitle="מסונכרן בזמן אמת — כל משתתף יכול להוסיף, לשבץ ולסמן"
      collectionName="packing"
      initialItems={initialPacking.map((item) => ({
        id: item.id,
        name: item.name,
        owner: item.owner,
        done: item.packed,
        details: item.note,
      }))}
      addButtonLabel="הוסף ציוד"
      itemNamePlaceholder="שם הפריט, למשל פנס ראש"
      detailsPlaceholder="הערה, למשל ציוד קבוצתי"
      seedButtonLabel="🚀 אתחל ציוד קבוצתי"
    />
  );
}

export default Packing;
