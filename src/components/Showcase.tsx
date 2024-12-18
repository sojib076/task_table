import { useState, useRef, useEffect } from 'react';
import { DataTable, DataTablePageEvent,  } from 'primereact/datatable';
import { Column } from 'primereact/column';

import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

export default function ArtworkDataTable() {
    const [selectedArtworks, setSelectedArtworks] = useState<{ [key: string]: Artwork }>({});
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [rows, setRows] = useState(12);
    const [rowsToSelect, setRowsToSelect] = useState('');
    const [totalSelected, setTotalSelected] = useState(0);
    const remainingToSelect = useRef(0);
    const overlayPanelRef = useRef<OverlayPanel>(null);
    const toastRef = useRef<Toast>(null);

    const fetchArtworks = async (page: number) => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}`);
            const data = await response.json();
            const transformedData = data.data.map((artwork: any) => ({
                id: artwork.id,
                title: artwork.title,
                place_of_origin: artwork.place_of_origin || 'Unknown',
                artist_display: artwork.artist_display || 'Unknown Artist',
                inscriptions: artwork.inscriptions || 'No Inscriptions',
                date_start: artwork.date_start || 'N/A',
                date_end: artwork.date_end || 'N/A',
            }));
            setArtworks(transformedData);
            setTotalRecords(data.pagination.total);
            setLoading(false);

            
            if (remainingToSelect.current > 0) {
                const toSelect = Math.min(remainingToSelect.current, transformedData.length);
                const newSelections = { ...selectedArtworks };
                transformedData.slice(0, toSelect).forEach((artwork: Artwork) => {
                    newSelections[artwork.id] = artwork;
                });
                setSelectedArtworks(newSelections);
                remainingToSelect.current -= toSelect;
                setTotalSelected(prevTotal => prevTotal + toSelect);
            }
        } catch (error) {
            console.error('Error fetching artworks:', error);
            setLoading(false);
            toastRef.current?.show({severity: 'error', summary: 'Error', detail: 'Failed to fetch artworks', life: 3000});
        }
    };

    useEffect(() => {
        fetchArtworks(currentPage);
    }, [currentPage, rows]);

    const onPage = (event: DataTablePageEvent) => {
        if (event.page !== undefined) {
            setCurrentPage(event.page + 1);
        }
        setRows(event.rows);
    };

    const handleRowSelectionSubmit = () => {
        const numRows = parseInt(rowsToSelect);
        if (isNaN(numRows) || numRows <= 0) return;

        setSelectedArtworks({});
        setTotalSelected(0);
        remainingToSelect.current = numRows;
        setRowsToSelect('');
        overlayPanelRef.current?.hide();

        // Trigger a re-fetch of the current page to start selection
        fetchArtworks(currentPage);
    };

    const onSelectionChange = (e: any) => {
        const selection = e.value as Artwork[];
        const newSelections = selection.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {} as { [key: string]: Artwork });

        setSelectedArtworks(newSelections);
        setTotalSelected(selection.length);

        // Update remainingToSelect if we're still in auto-select mode
        if (remainingToSelect.current > 0) {
            remainingToSelect.current = Math.max(0, remainingToSelect.current - selection.length);
        }
    };

    const selectionHeader = (
        <div className="flex items-center justify-center">
            <Button
                
                className="p-1 mr-4"
                onClick={(e) => overlayPanelRef.current?.toggle(e)}
            >
                ⬇️
            </Button>
        </div>
    );

    const dateTemplate = (rowData: Artwork) => {
        if (rowData.date_start === rowData.date_end) {
            return rowData.date_start;
        }
        return `${rowData.date_start} - ${rowData.date_end}`;
    };

    return (
        <Card className="w-full max-w-6xl mx-auto p-4">
            <Toast ref={toastRef} />
            <div className="mb-4 flex items-center">
                <Badge value={totalSelected} severity="info" className="mr-4" />
                <Button 
                    onClick={() => {
                        setSelectedArtworks({});
                        setTotalSelected(0);
                        remainingToSelect.current = 0;
                    }}
                    className="ml-4"
                 
                >
                    Clear Selection
                </Button>
            </div>

            <DataTable 
                value={artworks} 
                paginator 
                rows={rows} 
                totalRecords={totalRecords}
                lazy
                first={(currentPage - 1) * rows}
                onPage={onPage}
                loading={loading}
                tableStyle={{ minWidth: '50rem' }}
                selectionMode="multiple"
                selection={Object.values(selectedArtworks)}
                onSelectionChange={onSelectionChange}
                dataKey="id"
            >
                <Column 
                    selectionMode="multiple" 
                    headerStyle={{ width: '4rem' }} 
                    
                    header={selectionHeader}
                ></Column>
                <Column field="id" header="ID" sortable style={{ width: '5%' }}></Column>
                <Column field="title" header="Title" sortable style={{ width: '20%' }}></Column>
                <Column field="place_of_origin" header="Place of Origin" sortable style={{ width: '15%' }}></Column>
                <Column field="artist_display" header="Artist" sortable style={{ width: '20%' }}></Column>
                <Column field="inscriptions" header="Inscriptions" style={{ width: '20%' }}></Column>
                <Column field="date_start" header="Date" body={dateTemplate} sortable style={{ width: '10%' }}></Column>
            </DataTable>

            <OverlayPanel ref={overlayPanelRef} showCloseIcon>
                <div className="space-y-4 p-4">
                    <input
                        type="number"
                        placeholder="Select rows..."
                        value={rowsToSelect}
                        onChange={(e) => setRowsToSelect(e.target.value)}
                        min="1"
                        max={totalRecords}
                    />
                    <Button 
                        onClick={handleRowSelectionSubmit}
                        className="w-full"
                    >
                        Submit
                    </Button>
                </div>
            </OverlayPanel>
        </Card>
    );
}

