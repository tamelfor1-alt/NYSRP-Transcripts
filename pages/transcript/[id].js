import { createClient } from '@supabase/supabase-js';
export async function getServerSideProps({ params }) {
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data }=await supabase.from('transcripts').select('*').eq('id',params.id).single();
return { props: { transcript: data || null } };
}
export default function Transcript({ transcript }){
if(!transcript)return <div style={{padding:40}}>Transcript not found.</div>;
return <div style={{padding:40,fontFamily:'sans-serif'}}><h1>{transcript.ticket_name}</h1><p>Created: {transcript.created_at}</p><pre style={{whiteSpace:'pre-wrap',background:'#f4f4f4',padding:20}}>{JSON.stringify(transcript.transcript,null,2)}</pre></div>
}