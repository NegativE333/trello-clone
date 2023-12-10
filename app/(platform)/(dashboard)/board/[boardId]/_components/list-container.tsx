"use client";

import { ListWithCards } from "@/types";
import { ListForm } from "./list-form";
import { useEffect, useState } from "react";
import { ListItem } from "./list-item";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useAction } from "@/hooks/use-action";
import { updateListOrder } from "@/actions/update-list-order";
import { toast } from "sonner";
import { updateCardOrder } from "@/actions/update-card-order";

interface ListContainerProps{
    data: ListWithCards[];
    boardId: string;
}

function reorder<T>(list : T[], startIndex: number, endIndex: number){
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

export const ListContainer = ({
    data,
    boardId
} : ListContainerProps) => {

    const [orderedData, setOrderdData] = useState(data);

    const {execute : executeUpdateListOrder} = useAction(updateListOrder, {
        onSuccess: (data) => {
            toast.success("List reordered!");
        },
        onError: (error) => {
            toast.error("Failed to reorder list.")
        }
    });

    const { execute: executeUpdateCardOrder} = useAction(updateCardOrder, {
        onSuccess: (data) => {
            toast.success("Card reordered!");
        },
        onError: (error) => {
            toast.error("Failed to reorder card.");
        }
    })

    useEffect(() => {
        setOrderdData(data);
    },[data]);

    const onDragEnd = (result : any) => {
        const { destination, source, type } = result;

        if(!destination){
            return;
        }

        //If Droped in the same position
        if(destination.droppableId === source.droppableId && destination.index === source.index){
                return;
        }

        //User moves a list
        if(type === "list"){
            const items = reorder(
                orderedData,
                source.index,
                destination.index
            ).map((item, i) => ({...item, order: i}));

            setOrderdData(items);
            executeUpdateListOrder({ items, boardId });
        }

        //User moves a card
        if(type === "card"){
            let newOrderedData = [...orderedData];

            //Src and dest list
            const sourceList = newOrderedData.find(list => list.id === source.droppableId);
            const destList = newOrderedData.find(list => list.id === destination.droppableId); 
            
            if(!sourceList || !destList){
                return;
            }

            // Check if cards exists on sourceList
            if(!sourceList.cards){
                sourceList.cards = [];
            }

            //Check if cards exixts on the destList
            if(!destList.cards){
                destList.cards = [];
            }

            // Moving the card in the same list
            if(source.droppableId === destination.droppableId){
                const reorderedCards = reorder(
                    sourceList.cards,
                    source.index,
                    destination.index,
                );

                reorderedCards.forEach((card, i) => {
                    card.order = i;
                });

                sourceList.cards = reorderedCards;

                setOrderdData(newOrderedData);
                executeUpdateCardOrder({boardId, items : reorderedCards})
                
            } // User moves the card to another list
            else{
                //Remove card from src list
                const[movedCard] = sourceList.cards.splice(source.index, 1);

                //Assign the new listId to moved card
                movedCard.listId = destination.droppableId;

                //Add card to dest list
                destList.cards.splice(destination.index, 0, movedCard);

                sourceList.cards.forEach((card, i) => {
                    card.order = i;
                });

                //Update the order for each card in the dest list
                destList.cards.forEach((card, i) => {
                    card.order = i;
                });

                setOrderdData(newOrderedData);
                executeUpdateCardOrder({boardId, items: destList.cards});
            }
        }

    }

    return(
        <DragDropContext
            onDragEnd={onDragEnd}
        >
            <Droppable droppableId="lists" type="list" direction="horizontal">
                {(provided) => (
                    <ol 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex gap-x-3 h-full"
                    >
                        {orderedData.map((list, i) => (
                            <ListItem 
                                key={list.id}
                                index={i}
                                data={list}
                            />
                            ))}
                            {provided.placeholder}
                        <ListForm />
                        <div className="flex shrink-0 w-1"/>
                    </ol>
                )}
            </Droppable>
        </DragDropContext>
    )
}