export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=hazard_report.csv');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const csv = "id,class,confidence,latitude,longitude,status\n" +
              "DET-001,pipeline or cable,94.6,15.301400,73.800900,VERIFIED\n" +
              "DET-002,underwater residual mound,89.2,15.298800,73.801800,VERIFIED\n";
  
  return res.status(200).send(csv);
}
