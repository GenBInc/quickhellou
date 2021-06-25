from accounts.models import (User, Profile)
from dashboard.models import (Widget, Communication, CommunicationSession, ApplicationSettings, ClientBoard)
from rest_framework import serializers
from rest_framework.serializers import (CharField, IntegerField)
from rest_framework.decorators import action
from rest_framework.response import Response

import time
import uuid

class ApplicationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationSettings
        fields = ('id', 'property','value')
    
class CommunicationSessionSerializer(serializers.ModelSerializer):
    id = IntegerField(label='id', read_only=True)
    class Meta:
        model = CommunicationSession
        fields = ('id', 'uuid', 'status')
        read_only_fields = ('id',)

class CommunicationSerializer(serializers.ModelSerializer):
    id = IntegerField(label='id', read_only=True)
    widget_uuid = CharField(write_only=True)
    widget = serializers.SlugRelatedField(read_only=True, many=False, slug_field='uuid')
    sessions = CommunicationSessionSerializer(source='communicationsession_set', \
        many=True, read_only=True)

    class Meta:
        model = Communication
        fields = ('id', 'caller_name', 'widget', 'sessions', 'widget_uuid')
        read_only_fields = ('sessions',)


    def get_communicationsession_set(self, instance):
        objs = []
        a = instance.communicationsession_set.all()
        for i in a:
            objs.append({'uuid':i.uuid, 'status':i.status})
        return objs

    def create(self, validated_data):
        
        widget = Widget.objects.get(uuid=validated_data['widget_uuid'])
        
        #create user
        ts = int(time.time())
        client_user = User.objects.create(email = '{0}@genb.com'.format(uuid.uuid5(uuid.NAMESPACE_DNS, \
            str(ts))))
        client_user.set_as_guest()
        client_user.client_board = widget.client_board
        client_user.save()
        
        # create user profile
        profile = Profile.objects.create_profile(client_user, validated_data['caller_name'])
        
        #create communication
        communication = Communication.objects.create(caller=client_user, \
            caller_name=validated_data['caller_name'], client_board = widget.client_board, \
                widget=widget)
        communication.save()

        # create communication session
        comSession = CommunicationSession.objects.create_session(communication)
        
        return communication 

class WidgetSerializer(serializers.HyperlinkedModelSerializer):
    client_board_id = CharField(source='client_board.uuid')
    assignees = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)

    class Meta:
        model = Widget
        fields = ('id', 'uuid', 'assignees', 'client_board_id')

class UserSerializer(serializers.HyperlinkedModelSerializer):
    client_board_id = CharField(source='client_board.uuid')
    
    widget_list = serializers.SerializerMethodField()
  
    def get_widget_list(self, instance):
        ids = []
        a = instance.widget_user.all()
        for i in a:
            ids.append({'id':i.uuid, 'is_installed':i.is_installed})
        return ids
    
    class Meta:
        model = User
        fields = ('id', 'uuid', 'widget_list', 'client_board_id')
